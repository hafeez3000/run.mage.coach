    <div id="page ">
      <div id="my-clouds">
        <marquee behavior="scroll" direction="right" scrollamount="5">
            <i class="fa fa-cloud" style="background:transparent!important;color:white;font-size:60px"></i>
        </marquee>
      </div>    
      <div id="content">
        <!--<h2>Analyze your website speed and performance:</h2>-->

        <form id="analyze-form" method="post" action="/">
          <input id="analyze-url" name="url" type="url" required pattern="https?://.+"  placeholder="http(s)://" title="Add a URL starting with http(s)://">
          <label><span>Browser:</span> <select name="browser">
            <option value="chrome" selected>Chrome</option>
            <option value="firefox">Firefox</option>
          </select></label>
	  <label><span>Device type:</span> <select name="display">
            <option value="desktop" selected>Desktop</option>
            <option value="mobile">Mobile</option>
          </select></label>
          <label><span>Connection type:</span> <select name="connection">
            <option value="3g">3g - 1600/768 300 RTT</option>
            <option value="3gfast">3gfast - 1600/768 150 RTT</option>
            <option value="3gslow">3gslow - 780/330 200 RTT</option>
            <option value="3gem">3gem - 400/400 400 RTT</option>
            <option value="2g">2g - 35/328 1300 RTT</option>
            <option value="cable" selected>cable - 5000/1000 28 RTT</option>
            <option value="native">native</option>
          </select></label>
          <label><span>Email:</span>
	    <input id="email" name="email" type="email" class="validate[required,custom[email]] data-input" placeholder="Please enter your email address." required>
          </label>
          <input type="submit" value="Start analyzing">
        </form>

      </div>
    </div>

