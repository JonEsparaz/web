import React from 'react';
import '../custom.scss';
import * as queries from '../graphql/queries';
import { GRAPHQL_AUTH_MODE } from '@aws-amplify/api/lib/types';
import { API } from 'aws-amplify';

import { withRouter, Switch, RouteComponentProps, Route } from 'react-router-dom';
import Amplify, { Analytics } from 'aws-amplify';
import awsconfig from '../../src/aws-exports';
import ReactGA from 'react-ga';
const RenderRouter = React.lazy(() => import('../components/RenderRouter/RenderRouter'));
const VideoOverlay = React.lazy(() => import('../components/VideoOverlay/VideoOverlay'));
const Blog = React.lazy(() => import('../components/Blog/Blog'));
const Notes = React.lazy(() => import('../components/Notes/Notes'));

if (window.location.hostname === "localhost")
  ReactGA.initialize('UA-4554612-19');
else if (window.location.hostname.includes("beta"))
  ReactGA.initialize('UA-4554612-19');
else
  ReactGA.initialize('UA-4554612-3');

type PageType = 'default' | 'video' | 'blog' | 'note';

Amplify.configure(awsconfig);

interface Params {
  id?: string;
  blog?: string;
  episode?: string;
  series?: string;
  note?: string;
}

interface Props extends RouteComponentProps<Params> {
  pageType: PageType;
}

interface State {
  content?: any;
  data: any;
}

class HomePage extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);

    this.state = {
      content: null,
      data: null
    }
    console.log(props)
    fetch('/static/data/redirect.json').then(function (response) {
      return response.json();
    })
      .then((myJson) => {
        console.log(props.match.params.id)
        ReactGA.pageview(window.location.pathname + window.location.search);
        Analytics.record({
          name: 'pageForward',
          attributes: { page: props.match.params.id }
        });
        const forwardTo = myJson.filter((a: any) => { return a.id === props.match.params.id })
        console.log(forwardTo)
        if (forwardTo.length > 0)
          this.navigateUrl(forwardTo[0].to)
      })

    const pageType = this.props.pageType ?? 'default';
    let jsonFile: string;
    switch (pageType) {
      case 'video':
        jsonFile = 'video-player'
        break;
      case 'blog':
        jsonFile = 'blog-post'
        break;
      case 'note':
        jsonFile = 'notes-reader'
        break;
      case 'default':
        jsonFile = props.match.params.id || 'homepage'
        break;
    }
    ReactGA.pageview(window.location.pathname + window.location.search);
    Analytics.record({
      name: 'pageVisit',
      attributes: { page: jsonFile }
    });
    if (jsonFile === "test") {
      fetch('/static/content/' + jsonFile.toLowerCase() + '.json').then(function (response) {
        console.log(response)
        return response.json();
      })
        .then((myJson) => {
          console.log(myJson)
          this.setState({ content: myJson });
          myJson.page.test.forEach((items: any) => {
            fetch('/static/content/' + items.toLowerCase() + '.json').then(function (response) {
              console.log(response)
              return response.json();
            })
              .then((myJson2) => {
                const c = this.state.content
                c.page.content = c.page.content.concat(myJson2.page.content)
                this.setState({ content: c });
              }).catch((e) => { console.log(e) })
          })
        }).catch((e) => {
          console.log(e)
        })
    } else if (jsonFile !== 'notes-reader') {
      fetch('/static/content/' + jsonFile.toLowerCase() + '.json').then(function (response) {
        console.log(response)
        return response.json();
      })
        .then((myJson) => {

          this.setState({ content: myJson }, () => {
            console.log(this.state.content.page.pageConfig.weatherAlert)
            console.log(this.props.match.params.id)
            if (this.state.content.page.pageConfig.weatherAlert && (this.props.match.params.id === "" || this.props.match.params.id === undefined)) {
              this.navigateTo("/weather");

            }
          });
        }).catch((e) => {
          fetch('/static/redirect/' + jsonFile.toLowerCase() + '.json').then(function (response) {
            console.log(response)
            return response.json();
          })
            .then((myJson) => {

              this.setState({ content: myJson });
            }).catch((e) => {
              Analytics.record({
                name: 'error',
                attributes: { page: jsonFile }
              });
              fetch('/static/content/404.json').then(function (response) {
                console.log(response)
                return response.json();
              })
                .then((myJson) => {

                  this.setState({ content: myJson });
                }).catch((e) => {
                  console.log(e)
                })
            })
        })
    }
    this.navigateHome = this.navigateHome.bind(this);

    if (pageType === 'video') {
      const getVideo: any = API.graphql({
        query: queries.getVideo,
        variables: { id: this.props.match.params.episode },
        authMode: GRAPHQL_AUTH_MODE.API_KEY
      });
      getVideo.then((json: any) => {
        console.log({ "Success queries.getVideo: ": json });
        this.setState({ data: json.data.getVideo })

      }).catch((e: any) => { console.log(e) })
    } else if (pageType === 'blog') {
      const getBlog: any = API.graphql({
        query: queries.getBlog,
        variables: { id: this.props.match.params.blog },
        authMode: GRAPHQL_AUTH_MODE.API_KEY
      });
      getBlog.then((json: any) => {
        console.log({ "Success queries.getBlog: ": json });
        this.setState({ data: json.data.getBlog })
        console.log(this.state.data);
      }).catch((e: Error) => { console.error(e) })
    }
  }


  navigateUrl(to: string) {
    window.location.href = to;
  }

  navigateTo(uri: any) {
    console.log("Navigate to:" + uri)
    this.props.history.push(uri, "as")
    const unblock = this.props.history.block('Are you sure you want to leave this page?');
    unblock();

  }
  navigateHome(to: any) {
    this.props.history.push(to, "as")
    const unblock = this.props.history.block('Are you sure you want to leave this page?');
    unblock();

  }

  render() {
    const { isPopup = false, navigateOnPopupClose = false } = this.state.content?.page.pageConfig ?? {};

    return (
      <Switch>
        <Route path={["/videos/:series/:episode", "/vidoes/:series"]}>
          <VideoOverlay onClose={() => this.navigateHome("/")} data={this.state.data}></VideoOverlay>
        </Route>
        <Route path="/posts/:blog">
          <Blog data={this.state.data} />
        </Route>
        <Route path="/notes/:date?">
          <Notes />
        </Route>
        <Route path="*">
          {isPopup
            ? <VideoOverlay onClose={() => this.navigateHome(navigateOnPopupClose)} content={this.state.content} data={{ id: this.props.match.params.episode }}></VideoOverlay>
            : <RenderRouter data={null} content={this.state.content}></RenderRouter>}
        </Route>
      </Switch>
    );
  }
}

export default withRouter(HomePage);